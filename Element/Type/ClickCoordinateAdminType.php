<?php

namespace Mapbender\MapToolBundle\Element\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolverInterface;

/**
 * Description of ClickCoordinateAdminType
 *
 * @author Paul Schmidt
 */
class ClickCoordinateAdminType extends AbstractType
{
    /**
     * @inheritdoc
     */
    public function getName()
    {
        return 'clickcoordinate';
    }
    /**
     * @inheritdoc
     */
    public function setDefaultOptions(OptionsResolverInterface $resolver)
    {
        $resolver->setDefaults(array(
            'application' => null
        ));
    }
    /**
     * @inheritdoc
     */
    public function buildForm(FormBuilderInterface $builder, array $options)
    {
        $builder->add('title', 'text', array('required' => false))
            ->add('type', 'choice', array(
                'required' => true,
                'choices' => array(
                    'element' => 'Element',
                    'dialog' => 'Dialog')))
            ->add('target', 'target_element',
                array(
                'element_class' => 'Mapbender\\CoreBundle\\Element\\Map',
                'application' => $options['application'],
                'property_path' => '[target]',
                'required' => false))
            ->add('srs_list', 'text', array('required' => false))
            ->add('add_map_srs_list', 'checkbox', array('required' => false));
    }
}
