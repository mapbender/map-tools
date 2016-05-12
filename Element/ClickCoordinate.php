<?php
/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace Mapbender\MapToolBundle\Element;

use Mapbender\CoreBundle\Component\Element;

/**
 * Description of MapCoordinate
 *
 * @author Paul Schmidt
 */
class ClickCoordinate extends Element
{

    /**
     * @inheritdoc
     */
    public static function getClassTitle()
    {
        return "mb.maptool.clickcoordinate.class.title";
    }

    /**
     * @inheritdoc
     */
    public static function getClassDescription()
    {
        return "mb.maptool.clickcoordinate.class.description";
    }

    /**
     * @inheritdoc
     */
    public static function getClassTags()
    {
        return array(
            'mb.maptool.clickcoordinate.tag.coordinate',
            'mb.maptool.clickcoordinate.tag.map'
        );
    }

    /**
     * @inheritdoc
     */
    public static function getDefaultConfiguration()
    {
        return array(
            'type' => null,
            'target' => null,
            'srs_list' => '',
            'add_map_srs_list' => true,
            'extern_collapsible' => true,
            'extern_opened' => true,
            'sep_ord_field' => '32', // only single ascii
            'sep_coord_field' => '44', // only single ascii
            'sep_ord_clipboard' => '44', // only single ascii
            'sep_coord_clipboard' => '10', // only single ascii
        );
    }

    /**
     * @inheritdoc
     */
    public function getConfiguration()
    {
        $configuration = array_merge($this->getDefaultConfiguration(), parent::getConfiguration());
        $configuration['srsDefs'] = array();
        if (isset($configuration["srs_list"])) {
            if (is_array($configuration["srs_list"])) {
                $srs_list = $configuration["srs_list"];
            } elseif (is_string($configuration["srs_list"]) && strlen(trim($configuration["srs_list"])) > 0) {
                $srs_list = preg_split("/\s?,\s?/", $configuration["srs_list"]);
            } else {
                $srs_list = array();
            }
            $allsrs = array();
            foreach ($srs_list as $srs) {
                if (is_int(stripos($srs, "|"))) {
                    $srsHlp   = preg_split("/\s?\|{1}\s?/", $srs);
                    $allsrs[] = array(
                        "name" => trim($srsHlp[0]),
                        "title" => strlen(trim($srsHlp[1])) > 0 ? trim($srsHlp[1]) : '');
                } else {
                    $allsrs[] = array(
                        "name" => $srs,
                        "title" => '');
                }
            }
            $allsrs = array_unique($allsrs, SORT_REGULAR);
            $configuration["srsDefs"] = $this->getSrsDefinitions($allsrs);
            unset($configuration["srs_list"]);
        }
        return $configuration;
    }


    /**
     * @inheritdoc
     */
    public function getWidgetName()
    {
        return 'mapbender.mbMapClickCoordinate';
    }

    /**
     * @inheritdoc
     */
    public static function getType()
    {
        return 'Mapbender\MapToolBundle\Element\Type\ClickCoordinateAdminType';
    }

    /**
     * @inheritdoc
     */
    public static function getFormTemplate()
    {
        return 'MapbenderMapToolBundle:ElementAdmin:clickcoordinate.html.twig';
    }

    /**
     * @inheritdoc
     */
    public function getAssets()
    {
        return array(
            'js' => array(
                '@MapbenderMapToolBundle/Resources/public/mapbender.element.clickcoordinate.js',
                '@MapbenderMapToolBundle/Resources/public/mapbender.container.info.js',
                '@FOMCoreBundle/Resources/public/js/widgets/popup.js',
                '@FOMCoreBundle/Resources/public/js/widgets/dropdown.js'
            ),
            'css' => array('@MapbenderMapToolBundle/Resources/public/sass/element/mapbender.element.mapcoordinate.scss'),
            'trans' => array('MapbenderMapToolBundle:Element:clickcoordinate.json.twig')
        );
    }

    /**
     * @inheritdoc
     */
    public function render()
    {
        return $this->container->get('templating')
                ->render(
                    'MapbenderMapToolBundle:Element:clickcoordinate.html.twig',
                    array(
                    'id' => $this->getId(),
                    'title' => $this->getTitle(),
                    'configuration' => $this->getConfiguration()
                    )
        );
    }

    /**
     * Returns proj4js srs definitions from srs names
     * @param array $srsNames srs names (array with "EPSG" codes)
     * @return array proj4js srs definitions
     */
    protected function getSrsDefinitions(array $srsNames)
    {
        $result = array();
        if (is_array($srsNames) && count($srsNames) > 0) {
            $names = array();
            foreach ($srsNames as $srsName) {
                $names[] = $srsName['name'];
            }
            $em    = $this->container->get("doctrine")->getManager();
            $query = $em->createQuery("SELECT srs FROM MapbenderCoreBundle:SRS srs"
                    . " Where srs.name IN (:name)  ORDER BY srs.id ASC")
                ->setParameter('name', $names);
            $srses = $query->getResult();
            foreach ($srsNames as $srsName) {
                foreach ($srses as $srs) {
                    if ($srsName['name'] === $srs->getName()) {
                        $result[] = array(
                            "name" => $srs->getName(),
                            "title" => strlen($srsName["title"]) > 0 ? $srsName["title"] : $srs->getTitle(),
                            "definition" => $srs->getDefinition());
                        break;
                    }
                }
            }
        }
        return $result;
    }
}
