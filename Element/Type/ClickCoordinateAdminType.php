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
        // only single ascii as string !!!
        $choices = array(
            '44' => 'comma',
            '59' => 'semicolon',
            '32' => 'space'
        );
        $choicesExt = $choices + array( '10' => 'new line');// only single ascii !!!
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
            ->add('add_map_srs_list', 'checkbox', array('required' => false))
            ->add('extern_collapsible', 'checkbox', array('required' => false))
            ->add('extern_opened', 'checkbox', array('required' => false))
            ->add('sep_ord_field', 'choice', array(
                'required' => true,
                'choices' => $choices))
            ->add('sep_coord_field', 'choice', array(
                'required' => true,
                'choices' => $choices))
            ->add('sep_ord_clipboard', 'choice', array(
                'required' => true,
                'choices' => $choicesExt))
            ->add('sep_coord_clipboard', 'choice', array(
                'required' => true,
                'choices' => $choicesExt));
    }
}
