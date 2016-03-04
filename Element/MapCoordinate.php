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
class MapCoordinate extends Element
{

    /**
     * @inheritdoc
     */
    public static function getClassTitle()
    {
        return "Map Koordinate"; #"mb.core.mapcoordinate.class.title";
    }

    /**
     * @inheritdoc
     */
    public static function getClassDescription()
    {
        return 'Mit dem "Map Koordinate" kann die Klick-Koordinate ausgelesen werden' .
            ' und die Karte kann auf die gegebene Koordinate zentriert werden.'; #"mb.core.mapcoordinate.class.description";
    }

    /**
     * @inheritdoc
     */
    public static function getClassTags()
    {
        return array(); #('mb.core.mapcoordinate.tag.coordinate');
    }

    /**
     * @inheritdoc
     */
    public static function getDefaultConfiguration()
    {
        return array(
            'tools' => array('centermap', 'clickcoordinate'),
            'type' => null,
            'target' => null,
        );
    }

    /**
     * @inheritdoc
     */
    public function getConfiguration()
    {
        $configuration = parent::getConfiguration();
        if (!isset($configuration['tools'])) {
            $default = self::getDefaultConfiguration();
            $configuration['tools'] = $default['tools'];
        }
        return $configuration;
    }

    /**
     * @inheritdoc
     */
    public function getWidgetName()
    {
        return 'mapbender.mbMapCoordinate';
    }

    /**
     * @inheritdoc
     */
    public static function getType()
    {
        return 'Mapbender\MapToolBundle\Element\Type\MapCoordinateAdminType';
    }

    /**
     * @inheritdoc
     */
    public static function getFormTemplate()
    {
        return 'MapbenderMapToolBundle:ElementAdmin:mapcoordinate.html.twig';
    }

    /**
     * @inheritdoc
     */
    public function getAssets()
    {
        return array(
            'js' => array(
                '@MapbenderMapToolBundle/Resources/public/mapbender.element.mapcoordinate.js',
                '@MapbenderMapToolBundle/Resources/public/mapbender.container.info.js',
                '@FOMCoreBundle/Resources/public/js/widgets/popup.js'
            ),
            'css' => array('@MapbenderMapToolBundle/Resources/public/sass/element/mapbender.element.mapcoordinate.scss'),
            'trans' => array()
        );
    }

    /**
     * @inheritdoc
     */
    public function render()
    {
        return $this->container->get('templating')
                ->render(
                    'MapbenderMapToolBundle:Element:mapcoordinate.html.twig',
                    array(
                    'id' => $this->getId(),
                    'title' => $this->getTitle(),
                    'configuration' => $this->getConfiguration()
                    )
        );
    }
}
